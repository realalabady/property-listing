CompTIA Security+ (SY0-701) - Results
Attempt 2

Question 1
Incorrect
Why might an organization be particularly concerned about introducing automation tools that become single points of failure during secure operations?
Your answer is incorrect
Issues related to system scalability and slow authentication.
Potential gaps in maintaining data integrity.
Correct answer
Compromised availability leading to operational disruptions.
Challenges in upholding data confidentiality.
Overall explanation
OBJ: 4.7 - A single point of failure can jeopardize the entire system's uptime, introducing potential security risks and halting processes. Upholding data confidentiality is a primary security concern, but it isn't directly related to the risks of single points of failure. Data integrity ensures data remains accurate and consistent over its lifecycle, but it doesn't directly link to concerns of single points of failure. Scalability ensures systems can handle growth, but it isn't focused on the immediate availability risks associated with single points of failure.

Domain
Security Operations
Question 2
Incorrect
To improve security at their law firm, Norah, a security analyst wants to implement a system that will selectively block or allow traffic based on the nature of the communication. Which firewall type would be MOST effective for this purpose?
Your answer is incorrect
Layer 4 Firewall
Correct answer
Layer 7 Firewall
802.1x
VPN
Overall explanation
OBJ: 3.2 - A Layer 7 firewall operates at the application layer and can make more granular decisions about the traffic based on the application-payload, which makes it the most effective choice in this scenario. 802.1x is a standard developed by the IEEE to govern port-based network access. When used with a RADIUS based authentication server it provides authentication services, checking user credentials to ensure that the user is a legitimate part of the organization and granting access to only those areas of the system that the user is allowed to access. A Layer 4 Firewall operates at the transport layer which provides less granularity for blocking or allowing traffic based on the application-payload. A VPN provides a secure method for remote operations by creating an encrypted connection over the internet. It establishes a secure tunnel so that data can be securely transferred even over insecure networks.

Domain
Security Architecture
Question 3
Incorrect
Reginald, an IT Manager, is the owner of a file on a server and wants to grant his colleagues access to the file. He is the only one who can decide who is allowed access to the file and what actions they can perform on it. Which authorization model is being used in this scenario?

Correct answer
DAC
Your answer is incorrect
RBAC
MAC
ABAC
Overall explanation
OBJ: 1.2 - Discretionary Access Control (DAC) is an authorization model where the owner of the resource decides who is allowed to access it. Mandatory Access Control (MAC) is an authorization model where access to resources is determined by a set of rules defined by a central authority. Role-Based Access Control (RBAC) is an authorization model that assigns permissions to roles, rather than individual users. Attribute Based Access Control (ABAC) determines access through a combination of contexts and system wide attributes.

Domain
General Security Concepts
Question 4
Correct
Which of the following hardening techniques can help protect systems or devices from attacks by installing software like a firewall or antivirus directly on user devices to report and block potential attacks?

Your answer is correct
Installation of endpoint protection
Changing Default Passwords
Least Privilege
Patching
Overall explanation
OBJ: 2.5 - Installation of endpoint protection includes installing antivirus, anti-malware, and firewall software on systems or devices. This software helps protect systems and devices from known vulnerabilities. Patching is a mitigation technique that can help prevent exploitation of known vulnerabilities on systems and devices by updating them with the latest security fixes and enhancements. Patching involves applying patches or updates to all software and systems, not just those that provide host security like firewalls. Least privilege is a mitigation technique that limits users to the level of access and privilege they need to do their work. This can limit the extent of an attack by limiting the attacker’s access and privilege to those of the compromised user. Least privilege involves applying predefined rules and permissions, such as roles, groups, and functions and enforcing the rules and permissions through mechanisms such as passwords, tokens, and biometrics. Default password changes is a hardening technique that can help prevent some password attacks on systems and devices. This is done by changing the default or factory-set passwords that may be easily cracked by automated tools or dictionaries because they are often reused or drawn from a small pool of passwords. Password managers, password generators, and security policies can be used to create and enforce the use of strong and unique passwords for each system and device. It doesn't involve installing antivirus software.

Domain
Threats, Vulnerabilities, and Mitigations
Question 5
Correct
Kelly Innovations decides to manage its IT infrastructure within its physical location, retaining full control over its hardware, software, and data. Which of the following security implications is MOST directly associated with this approach?
Your answer is correct
Increased responsibility for physical security.
Multi-tenancy risks.
Dependence on external patch availability.
Risk transference to third-party vendors.
Overall explanation
OBJ: 3.1 - With on-premise infrastructure, organizations must ensure the physical safety of servers and other equipment against theft, tampering, and disasters. On-premise infrastructure typically allows for more control over when and how patches are applied, rather than being dependent on third-party vendors. Multi-tenancy is a concern in shared cloud environments where resources are shared among different clients, not in on-premise setups. Risk transference to third-party vendors is more relevant to cloud-based services where responsibilities are often shared between the provider and the customer.

Domain
Security Architecture
Question 6
Correct
At Kelly Innovations LLC, Susan has been entrusted with determining the purposes and means of processing personal data for the organization's new marketing campaign. She decides what data to collect, how long it will be retained, and with whom it will be shared. Which of the following BEST describes the role Susan is playing?
Your answer is correct
Data Controller
Data Custodian
Data Subject
Data Processor
Overall explanation
OBJ: 5.4 - A Data Controller is an individual or entity that determines the purposes and means of processing personal data. They have primary responsibility for ensuring the data's protection and compliance with privacy regulations. An identifiable person whose personal data is being processed by a data controller or processor. A Data Processor is an individual or entity that processes personal data on behalf of the data controller, without deciding the purposes or means of the processing. The Data Custodian typically responsible for ensuring the safety and maintenance of data assets through its various stages of storage, but doesn't decide on processing methods.

Domain
Security Program Management and Oversight
Question 7
Correct
Given the need for resilience and the ability to recover in a security architecture, which of the following devices ensures uninterrupted operation during a power outage?
Power Strip
Voltage Regulator
Onsite/offsite backups
Your answer is correct
Uninterruptible power supply (UPS)
Overall explanation
OBJ: 3.4 - A UPS is a device that provides emergency power to a load when the input power source fails, thus ensuring continuous operation. A voltage regulator ensures that the voltage supplied to a device remains constant, even if there are fluctuations in the power source. However, it does not provide backup power during an outage. While onsite and offsite backups ensure data preservation, they don't guarantee power supply during a power loss. While a power strip allows for multiple devices to be plugged in simultaneously, it does not provide any form of power backup or protection against outages.

Domain
Security Architecture
Question 8
Incorrect
What is the name of a cryptographic key that can be freely distributed and used by others to encrypt messages?
Your answer is incorrect
Symmetric key
Digital signature
Hash key
Correct answer
Public key
Overall explanation
OBJ: 1.4 - A public key is used in asymmetric encryption. It can be freely distributed and used by others to encrypt messages, which can then only be decrypted by the corresponding private key. A digital signature is a mathematical scheme for verifying the authenticity of digital messages or documents. It is not a key used for encryption or decryption. A hash key is used in hash functions to map data of arbitrary size to fixed-size values. It is not used for encryption or decryption. A symmetric key is used in symmetric encryption where the same key is used for both encryption and decryption. It does not involve a pair of keys for encryption and decryption.

Domain
General Security Concepts
Question 9
Correct
Which mitigation technique involves shutting off specific entry and exit points in a system to prevent potential vulnerabilities or unauthorized access?
Monitoring
Your answer is correct
Disabling ports
Segmentation
Encryption
Overall explanation
OBJ: 2.5 - Disabling ports is the act of turning off specific communication points in a system to reduce potential vulnerabilities or halt unauthorized access. Encryption is the process of converting data into a code to prevent unauthorized access. It doesn't deal with turning off specific entry or exit points in a system. Monitoring is the continuous observation and checking of a system or network to ensure its functionality and security. It is not directly related to shutting off communication points. Segmentation is the dividing a network into different parts or segments for security and performance enhancement, but not specifically about shutting off communication points.

Domain
Threats, Vulnerabilities, and Mitigations
Question 10
Incorrect
Which group is MOST likely to possess the funding and resources to recruit top talent, including skilled strategists, designers, coders, and hackers?
An independent black hat hacker

A security researcher

Correct answer
A criminal syndicate

Your answer is incorrect
An open-source developer community

Overall explanation
OBJ: 2.1 - Large organized crime rings have the financial means to hire and maintain a team of skilled individuals for sophisticated cyber operations. While skilled, independent black hat hackers operate on their own and may not have the substantial resources a larger organization might. Though they have deep knowledge in cybersecurity, security researchers typically operate independently or within institutions, focusing on studying and mitigating threats. The main intent of an open-source development community is on collaborative software development and not cyber-attacks.

Domain
Threats, Vulnerabilities, and Mitigations
Question 11
Correct
Kelly Innovations LLC is redesigning its network infrastructure to support its expanding R&D team. Which of the following strategies will MOST effectively lessen the attack surface?

Implementing a single-layered security approach.
Your answer is correct
Disabling unnecessary services and protocols.
Allowing most inbound and outbound traffic.
Using the same password for all devices.
Overall explanation
OBJ: 3.2 - Reducing active services and protocols minimizes potential entry points for attackers, thereby reducing the attack surface. Relying on a single layer of security can leave the network vulnerable if that layer is compromised. Allowing most inbound and outbound traffic would significantly expand the attack surface by allowing potentially malicious traffic. Uniform passwords increase the risk of a widespread breach if the common password is compromised.

Domain
Security Architecture
Question 12
Correct
What type of encryption only affects a section of a storage device?
Your answer is correct
Partition encryption
Database encryption
File-level encryption
Full-disk encryption
Overall explanation
OBJ: 1.4 - Partition encryption matches the encryption affects a section of a storage device. Full-disk encryption encrypts all data on a physical or logical disk, not just a specific section of a storage device. File-level encryption encrypts individual files or folders on a storage device, not a specific partition. Database encryption encrypts data at the database level, not a specific partition.

Domain
General Security Concepts
Question 13
Incorrect
Within the IT department, Sarah has been designated to oversee the security measures for the new data management platform. She is accountable for the regular review of security protocols and responding to any breaches or vulnerabilities that may arise. Sarah's role would be BEST described by which of the following terms?

Risk register

Risk assessor

Correct answer
Risk owner

Your answer is incorrect
Risk indicator

Overall explanation
OBJ: 5.2 - Sarah exemplifies a risk owner, as she is tasked with the ongoing management and mitigation of risks pertaining to the data management platform. A risk register would be the tool Sarah uses to track and assess the risks, not her role. A risk indicator would be a metric Sarah might monitor to assess risk levels, not her position. A risk assessor might be a role that Sarah takes on when evaluating risks, but it does not encapsulate her comprehensive management responsibilities.

Domain
Security Program Management and Oversight
Question 14
Correct
For ensuring the security of an HTTP application like WordPress or Magento against threats like SQL injection or cross-site scripting, which monitoring tool or method would be MOST appropriate?
Your answer is correct
Web application firewall (WAF)
Antivirus software
NetFlow
Host-based intrusion detection system (HIDS)
Overall explanation
OBJ: 4.4 - A WAF specifically protects web applications by filtering and monitoring HTTP traffic, providing defenses against web-specific attacks such as SQL injection. While HIDS monitors the internals of a computing system, it isn't explicitly designed to combat web application-specific threats. While antivirus software can detect malware and malicious files, it isn't particularly tailored to protect against web application-specific threats like SQL injection. NetFlow collects IP traffic information and monitors network flow data but doesn't specifically target web application vulnerabilities.

Domain
Security Operations
Question 15
Correct
Which of the following BEST describes the initial step to ensure a secure procurement process at Dion Training?
Determine the software's compatibility with existing systems.
Your answer is correct
Verify the legitimacy of the software vendor.
Check for discounts or bulk pricing.
Collaborate with the IT department for installation.
Overall explanation
OBJ: 4.1 - Before making any purchases, it's essential to ensure the vendor is reputable to avoid acquiring counterfeit or malicious software. Financial considerations, while valid, come after ensuring security. Compatibility is important, but first, you need to ensure you're buying from a reputable source. While collaboration is crucial, the first step should be to ensure the vendor's legitimacy.

Domain
Security Operations
Question 16
Incorrect
A power plant utilizes a specialized system to manage and monitor its daily operations, including machinery and sensor feedback. While these systems offer centralized control, what security concern is most associated with them?
Your answer is incorrect
Optimization for containerized deployments.
Constrained memory use.
Correct answer
Limited security update capabilities.
Runtime efficiency constraints.
Overall explanation
OBJ: 3.1 - SCADA systems are often engineered for specific tasks and might not receive regular security updates, making them susceptible to vulnerabilities over time. While important for real-time systems, runtime efficiency is not a primary security concern for SCADA systems. Memory constraints are more pertinent to embedded or real-time systems, not inherently a SCADA security concern. SCADA systems are not typically deployed in containers; thus, this isn't a relevant security implication.

Domain
Security Architecture
Question 17
Incorrect
Which method is used for the authentication process used in WPA2 with PSK?

Your answer is incorrect
Password Authenticated Key Exchange (PAKE).
QR codes for client device configuration.
Correct answer
Using a passphrase to generate a pairwise master key (PMK).
Dragonfly handshake with a MAC address hash.
Overall explanation
OBJ: 2.2 - WPA2-PSK leverages a passphrase to create a key, called the PMK, to encrypt communications. This is a distinguishing feature of WPA2's personal authentication. The Dragonfly handshake is a key feature of the WPA3's Simultaneous Authentication of Equals (SAE) method. This does not pertain to the WPA2 authentication mechanism. PAKE is specifically a method associated with WPA3's SAE protocol. It's not the method employed by WPA2 for authentication. QR codes for configuration relate to the newer Easy Connect method. It is not a characteristic of WPA2 Personal authentication.

Domain
Threats, Vulnerabilities, and Mitigations
Question 18
Correct
Travid is evaluating an attack that has occurred on his organization's system. He sees that the attacker entered a lot of data into the the area of memory in the API that temporarily stores user input. What type of attack did Travid discover?
Memory leak
Buffer underflow
Your answer is correct
Buffer overflow
Memory fragmentation
Overall explanation
OBJ: 2.3 - Buffer overflow is a type of memory corruption that occurs when a program writes more data than the allocated buffer, the area of memory set aside to temporarily hold user input, can hold. This causes the application to overwrite adjacent memory locations. It can lead to crashes, code execution, or privilege escalation. Buffer underflow is a type of memory corruption that occurs when a program reads more data than the allocated buffer can provide, causing it to read from invalid memory locations. It can lead to crashes, data leakage, or undefined behavior. Memory fragmentation is a type of memory issue that occurs when a program allocates and frees memory in an irregular or inefficient manner, causing the available memory to be divided into small and non-contiguous blocks. It can lead to memory wastage, allocation failure, or reduced performance. Memory leak is a type of memory issue that occurs when a program fails to release or free the memory that it has allocated, causing it to consume more and more memory over time. It can lead to performance degradation, resource exhaustion, or out-of-memory errors.

Domain
Threats, Vulnerabilities, and Mitigations
Question 19
Correct
As part of a new building initiative, Dion Training Solutions plans to connect two office buildings via a direct physical link. Which measure will BEST protect the physical infrastructure connectivity?
Running the connection on overhead poles.
Your answer is correct
Installing the cable in a conduit buried underground.
Placing the cable on the ground between buildings.
Using wireless bridges without encryption.
Overall explanation
OBJ: 3.2 - Burying the connection underground within a protective conduit offers protection from environmental factors and unauthorized tampering. Laying cables on the ground without protection can expose them to damage and unauthorized access. Unencrypted wireless bridges can be susceptible to eavesdropping and interception. Overhead poles expose the connection to environmental factors and potential tampering, making it less secure.

Domain
Security Architecture
Question 20
Incorrect
After remedying a previously identified vulnerability in their systems, Kelly Innovations LLC wants to ensure that the remediation steps were successful. Which of the following is the BEST method that involves examining related system and network logs to enhance the vulnerability report validation process?

Correct answer
Reviewing event logs
Your answer is incorrect
Rescanning
Threat modeling
Patch management
Overall explanation
OBJ: 4.3 - Event logs can provide insight into system and process behaviors. By examining these logs, an organization can validate whether a vulnerability has been adequately addressed or if it's still causing issues. Rescanning is about running the vulnerability scan again to identify remaining vulnerabilities but doesn't provide insights from system and network logs. While it's about keeping systems updated, patch management itself doesn't involve examining logs to validate vulnerability remediation. Threat modeling is a process of understanding and mapping potential threats but doesn't validate vulnerability remediation through logs.

Domain
Security Operations
Question 21
Incorrect
As a security analyst, you are reviewing application logs while investigating a suspected breach. Which of the following pieces of information is NOT typically documented in the application log data?
Server IP address where the application is hosted.
Timestamps of application activity.
Correct answer
The physical location of the user accessing the application.
Your answer is incorrect
User IDs related to specific application transactions.
Overall explanation
OBJ: 4.9 - Application logs do NOT typically capture the physical location of the user accessing the application. While IP addresses can give a rough estimate of geographic location, accurate physical location (e.g., GPS coordinates or exact address) is not recorded in standard application logs. Timestamps of application activity are crucial for investigations. They enable the analysis of event occurrence sequence, making it possible to identify patterns and reconstruct the timeline of events. User IDs related to specific transactions do appear in application logs. This piece of information can help to identify the user who performed a specific action in the application, useful for incident response. The IP address of the server hosting the application frequently shows up in application logs. This information can be useful for understanding network-level behaviors associated with the application.

Domain
Security Operations
Question 22
Correct
Which of the following statements is NOT true about the importance of log aggregation?
Log aggregation helps to detect unusual activity or behavior that may indicate a security breach.
Log aggregation aids in maintaining regulatory compliance by keeping a record of events that happened in the system.
Log aggregation can enhance security by consolidating logs from different sources for easier analysis.
Your answer is correct
Log aggregation increases the complexity of managing and interpreting security logs.
Overall explanation
OBJ: 4.4 - The primary purpose of log aggregation is to simplify the management and interpretation of security logs. It doesn't increase the complexity, rather it reduces it by consolidating logs from various sources, making them easier to analyze and interpret. Hence, this statement is NOT TRUE about the importance of log aggregation. Log aggregation can help in maintaining regulatory compliance by keeping a record of all system events, which might be a requirement for some regulations or standards Log aggregation enhances security by bringing together logs from different sources into a centralized location for easier analysis and monitoring. Detecting unusual activity that could indicate a security breach is one of the primary purposes of log aggregation. It helps in identifying patterns that could be missed if logs are analyzed separately.

Domain
Security Operations
Question 23
Correct
Jamario, a security analyst at Dion Training, has just completed a vulnerability assessment on a company's internal web application. One of the vulnerabilities detected has a high likelihood of being exploited and, if successful, could expose sensitive customer data. Based on severity and potential impact, how should this vulnerability be classified?

Informational
Your answer is correct
Critical
Medium
Low
Overall explanation
OBJ: 4.3 - A critical classification is assigned to vulnerabilities that, if exploited, would cause significant damage, have a high likelihood of being exploited, or expose sensitive data. These should be addressed immediately. Medium vulnerabilities pose a moderate risk and usually have some mitigating factors that lessen their potential impact or likelihood of exploitation. Informational vulnerabilities are typically findings that don't pose any immediate risk but are documented to provide a complete view of the assessment. Low vulnerabilities have minimal potential damage and are less likely to be exploited. They are of lesser priority compared to other classifications.

Domain
Security Operations
Question 24
Correct
Which of the following threats is MOST likely to accidentally cause harm to the system?
Your answer is correct
Shadow IT
Nation-state actors
Hacktivist
Unskilled attackers
Overall explanation
OBJ: 2.1 - Shadow IT is a type of threat actor that is the result of unauthorized or unapproved IT systems or devices within an organization. Shadow IT can introduce security risks and compliance issues for an organization, but the damage is usually unintentional. It results from employees or insiders who bring in equipment or alter systems for their own convenience and without getting permission. Nation-state actors are a type of threat actor that is sponsored by a government or a country's military. They normally have high resources/funding and high level of sophistication/capability. Nation-state actors can launch advanced and persistent attacks against other countries, organizations, or individuals. They create harm on purpose. A hacktivist is a threat actor that is motivated by philosophical or political beliefs and often targets organizations or governments that they disagree with. Hacktivists may use unauthorized or unapproved IT systems or devices but the harm they cause is done on purpose An unskilled attacker is a type of threat actor that has little or no technical skills and has low resources/funding and low level of sophistication/capability. Unskilled attackers often launch simple and opportunistic attacks using tools or scripts developed by others. The damage they do might be minor, but they do intend to do damage.

Domain
Threats, Vulnerabilities, and Mitigations
Question 25
Correct
At Kelly Innovations Corp., Sarah noticed that their core business application, which tracks customer orders, was not updating inventory levels accurately. A recent update seemed to have introduced a bug. Which of the following would offer the BEST solution?
Your answer is correct
Application rollback
Patch management
Application restart
Dependency check
Overall explanation
OBJ: 1.3 - Reverting an application to a previous state or version from a backup to correct issues caused by updates or changes. In this scenario, restoring the application from a backup taken two days earlier is an example of an application rollback and would be the most effective solution. Patch management is the process of managing updates for software applications. While the issue arose from an update, Jason is not suggesting another patch but is recommending reverting to a previous state. Application restart involves stopping and then starting an application, often to apply changes or ensure updates have taken effect. While it may be a part of many troubleshooting processes, it wouldn't address the bug introduced by the update. Dependency check refers to ensuring that all required components, libraries, or modules needed by an application are present. The scenario doesn't suggest any missing dependencies; rather, it's a problem with the application's function.

Domain
General Security Concepts
Question 26
Correct
Which of the following BEST describes the Software Development Life Cycle (SDLC) in application security?
It primarily focuses on the speed of software delivery over security.
It replaces the need for regular software updates and patches.
It only considers security during the testing and creation phases of software development.
Your answer is correct
It emphasizes the integration of security in software creation and maintenance.
Overall explanation
OBJ: 5.1 - An SDLC ensures that security is a focal point in all stages of software development, from design to maintenance. While certain SDLC models, like Agile, prioritize quick deliveries, they don't overlook security. SDLC integrates security throughout its phases, not just during testing. Even with a robust SDLC, software may still require updates and patches post-deployment.

Domain
Security Program Management and Oversight
Question 27
Incorrect
Dion Training is considering a collaboration with a new IT service vendor. To ensure compliance and adherence to industry standards, Dion Training wishes to see verifiable evaluations of the vendor's security controls and practices. Which of the following would provide Dion Training with insights into the vendor's own internal evaluations of their security measures?
Customer testimonials
Correct answer
Evidence of internal audits
External penetration test reports
Your answer is incorrect
Regulatory compliance certificates
Overall explanation
OBJ: 5.3 - Evidence of Internal Audits showcases a vendor's proactive approach to maintaining and enhancing their security measures. Such audits are conducted internally and reflect a rigorous self-assessment of security practices, vulnerabilities, and control mechanisms. By reviewing these, a company can gain insights into the vendor's commitment to security, how they address potential weaknesses, and their overall cybersecurity health. This evidence can be instrumental in gauging the reliability and trustworthiness of the vendor's internal security framework. Regulatory compliance certificates indicate compliance with specific regulations but don't provide detailed insights into internal evaluations. While customer testimonials may provide feedback on the vendor's performance, they don't offer insights into the vendor's internal evaluations of their security measures. External penetration test reports show the results of external entities testing the vendor's defenses, not the vendor's own evaluations.

Domain
Security Program Management and Oversight
Question 28
Incorrect
Which of the following terms refers to how any country's government regulates how its citizens' data should be collected, stored, and processed?

Correct answer
National legal implications
Consent management

Your answer is incorrect
General Data Protection Regulation (GDPR)
Data encryption
Overall explanation
OBJ: 5.4 - National legal implications are laws and regulations set at the country level that outline the requirements and boundaries for data protection and privacy. Consent management is a process that ensures organizations obtain and manage the consent of individuals before collecting or processing their personal data. Data encryption is a method used to protect data from unauthorized access by converting it into a code. The GDPR is a regulation enacted by the European Union to ensure data protection and privacy for all its citizens.

Domain
Security Program Management and Oversight
Question 29
Correct
Dion Training has recently implemented a new web portal for their customers. During a routine security review, the IT team notices that some suspicious activities have been logged. An unknown user attempted to access the system with a strange pattern: when requesting a particular user file, instead of the usual URL structure ( /users/[username]/profile ) the system registered requests like ( /users/../admin/config ). Within a short span of time, several such patterns were identified, each trying to reach different sensitive files and directories. Given this information, which of the following types of attack is the user MOST likely attempting?
Attempting to escalate their privileges on the system.
Attempting to exploit a buffer overflow vulnerability.

Your answer is correct
Attempting to access files outside of intended directories.
Attempting to inject malicious scripts into the system.

Overall explanation
OBJ: 2.4 - This scenario is a classic example of directory traversal. The described activities are consistent with an attacker trying to move up the directory structure and access files or directories they shouldn't. This often involves navigating directories in ways the system didn't intend. Buffer overflow attacks involve overloading a system's memory buffer to cause it to crash or to insert malicious code. The activities described in the scenario are more about navigating the file system than overwhelming it. Injection attacks usually involve inputting malicious data into a system with the intent that it will be executed. The scenario described does not suggest data is being executed or run; rather, it's an attempt to navigate to unintended areas. Privilege escalation attacks aim to gain elevated access to resources that are normally protected from an application or user. While this might be an outcome or a motive, the method described here doesn't necessarily represent this type of attack.

Domain
Threats, Vulnerabilities, and Mitigations
Question 30
Correct
Georgina, a lawyer, needs to send a contract to their client for signature. She want to ensure that their client cannot later deny signing the contract. Which of the following methods can they use to prevent them from denying that they have signed contracts?

Encryption
Your answer is correct
Digital signatures
A cryptographic primitive
Firewalls
Overall explanation
OBJ: 1.2 - Digital signatures are a method used to provide non-repudiation by using cryptographic techniques to verify the authenticity of a message or document. Encryption is used to protect the confidentiality of information by making it unreadable to unauthorized users, but it does not provide non-repudiation. A Cryptographic primitive is a single occurrence of encryption, like one hash or one symmetric key. It is used for encryption. Non-repudiation requires multiple cryptographic primitives. Firewalls are used to protect networks by controlling incoming and outgoing traffic, but they do not provide non-repudiation.

Domain
General Security Concepts
Question 31
Correct
Which of the following terms emphasizes the mathematical structure used to scramble data so that only a specific key can unscramble it?
Your answer is correct
Encryption algorithm
Hash function
Digital signature
Cipher block
Overall explanation
OBJ: 1.4 - An encryption algorithm provides a structured method for converting plaintext into ciphertext. A good algorithm ensures data remains confidential and secure from unauthorized access. Digital signatures validate the authenticity and integrity of a message or document, ensuring it hasn't been tampered with since being signed. A cipher block refers to a fixed-size portion of data that an encryption algorithm processes. It doesn't define the mathematical method itself. A hash function takes input and returns a fixed-size string, typically used for verifying data integrity, but it does not encrypt data for the purpose of confidentiality.

Domain
General Security Concepts
Question 32
Incorrect
Which of the following BEST describes an approach where the foundational systems are set up and overseen using scripts and automated instruments instead of hands-on methods?
Air-gapped network
Microservices architecture
Your answer is incorrect
Serverless architecture
Correct answer
IaC

Overall explanation
OBJ: 3.1 - Infrastructure as code (IaC) allows infrastructure to be provisioned and managed using code, making it easier to manage, replicate, and scale. While serverless architecture reduces the complexity of deploying code into production, it doesn't involve defining the underlying infrastructure as code. An air-gapped network is a security measure that involves physically isolating a computer or network and ensuring it doesn't connect to unsecured networks, especially the public internet. It doesn't deal with infrastructure management methodologies. Microservices architecture is about designing software applications as suites of independently deployable services, but it doesn't directly address infrastructure provisioning through code.

Domain
Security Architecture
Question 33
Correct
Which of the following mitigation techniques can help enforce compliance with security standards and policies on a system or network by designating programs that are allowed to run and blocking all other programs from being run?
Least Privilege
Patching
Your answer is correct
Application allow list
Configuration Enforcement
Overall explanation
OBJ: 2.5 - Application allow list is a technique that can help enforce compliance with security standards and policies on a system or network by using a list of approved applications that are allowed to run and blocking all other applications that may violate the standards or policies. Application allow list involves using a list of applications that have been verified and authorized by the system or network administrator, and blocking all other applications that may not meet the security requirements or expectations of the system or network. Patching is a technique that can help prevent exploitation of known vulnerabilities on systems and devices by updating them with the latest security fixes and enhancements. Patching involves applying patches or updates to software and systems, but it does not use a list of approved applications that are allowed to run and block all other applications that may violate the standards or policies. Configuration enforcement is a mitigation technique that can help prevent unauthorized or improper changes that increase a system or device’s vulnerability to attack. By creating predefined security standards and policies, and enforcing them, configuration enforcement helps prevent the inadvertent or purposeful creation of vulnerabilities and security risks. This focuses on the configuration settings rather than the applications used within a system. Least privilege is a mitigation technique that limits users to the level of access and privilege they need to do their work. This can limit the extent of an attack by limiting the attacker’s access and privilege to those of the compromised user. Least privilege involves applying predefined rules and permissions, such as roles, groups, and functions and enforcing the rules and permissions through mechanisms such as passwords, tokens, and biometrics. This focuses on limiting the user policies rather than the application itself.

Domain
Threats, Vulnerabilities, and Mitigations
Question 34
Correct
What is the primary difference between sanitization and destruction in the disposal process?
Sanitization and destruction are synonyms and refer to the same process.
Your answer is correct
Sanitization involves erasing data so it cannot be recovered; destruction is total physical demolition of the asset.
Sanitization refers to physically damaging the asset to render it unusable, while destruction involves completely eliminating all residual data.
Sanitization concerns the reuse of assets in an organization, and destruction involves transferring those assets to a different department.
Overall explanation
OBJ: 4.6 - Sanitization involves the process of permanently erasing or de-identifying data on a device so it cannot be recovered, while destruction is about physically demolishing the asset, ensuring no data can be extracted from it. Sanitization does not refer to physically damaging the asset; instead, it has to do with removing or de-identifying data so it cannot be recovered. Destruction involves physical destruction of the asset itself. Sanitization and destruction refer to two different types of procedures in the disposal process and are not synonyms. Sanitization and destruction involve methods of removing or totally destroying data or assets rather than internal asset redistribution in an organization.

Domain
Security Operations
Question 35
Correct
When a legal organization routinely communicates with clients via email containing sensitive case details, which strategy would be the MOST effective to secure the communications?
Utilization of VPNs for email transmission
Conducting regular user cybersecurity training
Deployment of regular data backups to secure cloud storage
Your answer is correct
Implementation of end-to-end encrypted email
Overall explanation
OBJ: 3.3 - Implementation of end-to-end encrypted email ensures emails are decipherable only by the intended recipient, safeguarding sensitive content. Conducting regular user cybersecurity training educates users about best practices but doesn't directly protect email content. Utilization of VPNs for email transmission secures transmission of data over networks but isn't specialized for email content encryption. Deployment of regular data backups to secure cloud storage provides email storage solutions but doesn't inherently secure email transmissions.

Domain
Security Architecture
Question 36
Incorrect
Which of the following terms refers to a critical predictive metric that organizations monitor to foresee potential risks and their impact on operations?

Risk threshold
Risk parameters
Your answer is incorrect
Risk metrics
Correct answer
Key risk indicators
Overall explanation
OBJ: 5.2 - KRIs are metrics that provide early warnings of increasing risk exposures, enabling organizations' leadership to manage these risks proactively. A risk threshold is the defined level of risk an organization is willing to accept, not a predictive indicator. Risk metrics are quantitative measures of risk but do not specifically refer to the predictive indicators used for monitoring potential risks. Risk parameters are specific variables used within risk assessment processes, not predictive indicators.

Domain
Security Program Management and Oversight
Question 37
Correct
Which of the following BEST describes the primary purpose of archiving as a method to bolster security monitoring?
To maintain compliance with regulations without needing long-term data storage.
To analyze real-time threats and mitigate them instantly.
Your answer is correct
To provide historical insights into security incidents for future investigations.
To provide an external backup in case of system crashes
Overall explanation
OBJ: 4.4 - Archiving in the context of security is essential for maintaining a record of all system logs. This not only ensures that historical data is available for audits or investigations but also provides valuable insights into past incidents, aiding in enhancing security measures. While real-time threat analysis is crucial in security, archiving is more focused on preserving past data for future reference and not immediate threat mitigation. Compliance with regulations often requires long-term data storage, so this statement is contradictory. While backups are essential for system recovery, archiving in the security context goes beyond this and is centered around preserving logs and alerts for investigative and compliance purposes.

Domain
Security Operations
Question 38
Incorrect
Kelly Innovations LLC wants to implement a network appliance that focuses on filtering traffic based on source and destination IP addresses, and port numbers. Which layer of the OSI model is this appliance primarily operating at?
Layer 5
Layer 2
Correct answer
Layer 4
Your answer is incorrect
Layer 3
Overall explanation
OBJ: 3.2 - Layer 4, or the transport layer, deals with protocols like TCP and UDP and is concerned with port numbers and connection-oriented communication. Network appliances operating at this layer filter and manage traffic based on source and destination IP addresses, as well as port numbers. Layer 3, the network layer, is primarily focused on routing data and IP addressing. Devices at this layer, like routers, aren't primarily concerned with port numbers. Layer 5, the session layer, establishes, maintains, and terminates connections between applications on different devices. It doesn't handle filtering based on IP addresses and port numbers. Layer 2, the data link layer, deals with frames and MAC addresses. Switches typically operate at this layer.

Domain
Security Architecture
Question 39
Correct
During a network investigation, Aiden, a cybersecurity analyst, identifies two key irregularities: The CEO, who tends to work late, logged in from both Paris and Tokyo within five minutes, and there's an unexpected surge in emails from the HR department outside of recruitment season. Which of the following should the analyst be MOST concerned about based on these observations?
Your answer is correct
Simultaneous CEO logins from distant locations.
The absence of the CEO's usual late-night login.
The sudden increase in emails from the HR department.
A recent software update on the CEO's computer.
Overall explanation
OBJ: 2.4 - Simultaneous CEO logins from distant locations suggests that the CEO's credentials may have been compromised. It's unlikely for one person to log in from two vastly different geographical locations in such a short time frame. This could mean that an unauthorized entity has gained access to a potentially high-privilege account. It's common for employees to have specific patterns of logging in, but missing a usual login doesn't necessarily indicate a compromise. It could be due to various benign reasons, such as a change in the CEO's schedule or activities. While unusual email patterns can be an indicator of a compromised email account or a potential phishing campaign originating from a trusted source, it's not as direct an indicator as the simultaneous logins, especially without knowing the content and recipients of those emails. While software updates are essential for fixing vulnerabilities, merely updating software is not typically an immediate indicator of a security compromise. Unless there's evidence that the update itself was malicious or introduced vulnerabilities, it shouldn't be Aiden's primary concern in this context.

Domain
Threats, Vulnerabilities, and Mitigations
Question 40
Correct
Which of the following characteristics of a cloud architecture model describes a model that can quickly recover from failures due to adverse conditions?
Availability
Scalability
Your answer is correct
Resilience
Ease of Deployment
Overall explanation
OBJ: 3.1 - Resilience in cloud architecture refers to the ability of the system to quickly recover from failures and maintain operational performance, crucial for ensuring availability during adverse conditions. Availability refers to guaranteeing a system will continue to operate so that the system can be used regardless of conditions. Resilience, like availability, refers to keeping a system functioning, but also directly addresses how quickly a system can recover after adverse conditions have led to a failure. Scalability means that the system can expand when more resources are needed without creating lags or problems for users. This expansion isn't considered an adverse condition. Increased business is seen as a positive attribute. Resilience is the ability of a system to quickly recover after failures due to adverse conditions. Ease of Deployment means that new instances and the entire cloud environment can be easily created. Resilience is the ability to maintain operational performance and recover quickly from failures.

For support or reporting issues, include Question ID: 651707dd7ae092b7640ec669 in your ticket. Thank you.

Domain
Security Architecture
Question 41
Correct
Which of the following mitigation techniques can help protect a device from unauthorized network traffic solely by using software that can control network traffic based on predefined rules and policies?
Host-based Intrusion Prevention
Patching
Encryption
Your answer is correct
Host-based Firewall
Overall explanation
OBJ: 2.5 - Using a Host-based firewall is a hardening technique that can help protect a system or device from unauthorized or malicious network traffic. Host-based firewalls by use software to filter and control incoming and outgoing network traffic by using predefined rules and policies. The policies and rules are based on criteria such as source and destination IP address, port number, protocol. Host-based firewall involves installing software on a system or device. Encryption is a mitigation technique that involves using mathematical algorithms to transform data into an unreadable format. Encryption can protect data from unauthorized access or modification, as only those who have the secret key or algorithm can decrypt the data. Encryption will not stop data from entering a host machine. Using a Host-based Intrusion Prevention System (HIPS) is a hardening technique that can help prevent attacks from occurring. It is software that is installed on a system or device to detect and prevent unauthorized actions like file modifications and registry changes. A HIPS may include a firewall, but will contain other features as well. Patching is a mitigation technique that can help prevent exploitation of known vulnerabilities on systems and devices by updating them with the latest security fixes and enhancements. Patching involves applying patches or updates to any software and systems.

Domain
Threats, Vulnerabilities, and Mitigations
Question 42
Incorrect
What is the purpose of a security analyst doing due diligence in the vendor selection process?
Correct answer
To ensure that the vendor's practices align with the organization's requirements
To ensure that the chosen vendor is the best choice among the list of possible vendors
Your answer is incorrect
To compare multiple vendors' suppliers to ensure they are all diligent in analyzing their own supply chains.
To assess the vendor's ability to provide the goods or services when they have promised

Overall explanation
OBJ: 5.3 - Due diligence includes assessing the vendor's security practices and confirming that they meet the organization's security requirements and standards. Due diligence in the vendor selection process involves evaluating the financial stability and reliability of the vendor to ensure they are capable of fulfilling their obligations. Due diligence involves examining the vendors' security practices and ensuring that they comply with a company's own practices. It doesn't normally extend to evaluating a vendors' suppliers' supply chains. It is important to make the best choice of vendors, however that isn't what due diligence means. Due diligence may include checking their performance history and reputation with previous clients to gauge their track record.

Domain
Security Program Management and Oversight
Question 43
Correct
Before disposing of old computers at Kelly Innovations LLC, Sasha receives a document that confirms all data has been securely removed. What is this document known as?
Service Agreement
Your answer is correct
Certificate of Sanitization
Data Retention Policy
Purchase Order
Overall explanation
OBJ: 2.4 - A Certificate of Sanitization serves as a formal assurance that a device has undergone a thorough data cleansing process, ensuring all information has been securely and permanently erased. It is essential for maintaining data privacy, especially when disposing of or repurposing equipment. A service agreement is a formal contract that sets out terms and conditions between a service provider and a client. While it might specify various services, including data-related ones, it isn't a confirmation of data removal from a device. A Data Retention Policy defines the duration for which data should be stored and when it should be disposed of. While it addresses data management, it doesn't certify the secure erasure of data from a device. Typically used to authorize the purchase of goods or services. While it's an essential record in procurement processes, it doesn't have any relevance to the secure erasure of data from devices.

Domain
Security Operations
Question 44
Correct
Which of the following motivations refers to any act of stealing information from a system or network?
Your answer is correct
Data exfiltration
Disruption/chaos
Ethical motivations
Service disruption
Overall explanation
OBJ: 2.1 - Data exfiltration refers to the act of stealing sensitive or confidential data from a system or network. Data exfiltration can be done for financial gain, espionage, blackmail, or other purposes. Service disruption refers to the act of impairing or interrupting the availability or functionality of a system or network. Service disruption can be done as a form of protest, sabotage, or diversion of resources or it can be used to gain money through ransom. Attackers with ethical motivations will attack an organization that acts unjustly or improperly. There are many ways in which the attackers can publicize the unjust or improper actions, but data exfiltration is not as likely as defacement or other actions. If an attacker is motivated by wanting to cause disruption or chaos, she will want to create fear or panic. She might also want to slow down or stop interactions between an organization and its clients. Stealing information is less likely to cause these problems than attacks such as denial of services or ransomware.

Domain
Threats, Vulnerabilities, and Mitigations
Question 45
Correct
What term refers to an organization's predetermined level of acceptable risk exposure?
Risk appetite
Your answer is correct
Risk tolerance
Exposure factor
Conservative
Overall explanation
OBJ: 5.2 - Risk tolerance refers to an organization's predetermined level of acceptable risk exposure. It represents the extent to which an organization is willing to tolerate potential risks before taking action to mitigate or avoid them. The exposure factor is a calculation that determines the amount of value that is lost if an event takes place. It doesn't measure an organization's level of acceptable risk exposure. The term "conservative" is not directly related to risk management. In financial contexts, it may refer to a risk-averse approach or cautious decision-making. While similar to risk tolerance, risk appetite refers to the amount of risk an organization is willing to take on to achieve its strategic objectives. It represents the organization's overall attitude toward risk-taking.

Domain
Security Program Management and Oversight
Question 46
Correct
Which of the following statements BEST explains the importance of 'patching' in the context of vulnerability management?

Patching refers to regularly updating hardware components to ensure optimal performance and prevent system downtime.
Your answer is correct
Patching is the process of identifying and fixing security vulnerabilities in software, firmware, and operating systems to prevent potential exploits.
Patching refers to the process of securing physical entry points to an organization's premises.

Patching involves installing special, custom made features on software interfaces to enhance user experience and aesthetics.
Overall explanation
OBJ: 4.3 - Patching is the process of identifying and fixing security vulnerabilities in software, firmware, and operating systems. Regularly applying patches helps prevent potential exploits and ensures the system remains secure against known vulnerabilities. Patching is not related to securing physical entry points; instead, it focuses on software and firmware updates to address security vulnerabilities. Patching focuses on software updates to address security issues. It will update software that is used by hardware, but it doesn't update hardware components. Patching is not about installing special, custom made features software interfaces but rather updating software to address security vulnerabilities.

Domain
Security Operations
Question 47
Incorrect
Which asymmetric encryption technique provides a comparable level of security with shorter key lengths, making it efficient for cryptographic operations?
DSA
Diffie-Hellman
Your answer is incorrect
RSA
Correct answer
ECC

Overall explanation
OBJ: 1.4 - ECC (Elliptic curve cryptography) is a type of trapdoor function that is efficient with shorter key lengths. For instance, ECC with a 256-bit key provides roughly the same security as RSA with a 2048-bit key. The primary advantage is that ECC has no known shortcuts to cracking it, making it particularly robust. Diffie-Hellman is an algorithm primarily for secure key exchange, not directly comparable to the encryption efficiency offered by ECC's shorter key lengths. Digital Signature Algorithm (DSA) is an algorithm used for digital signatures, but it doesn't inherently offer the same efficiency in terms of key length as ECC. While a foundational asymmetric algorithm, RSA generally requires longer key lengths than ECC to achieve comparable security levels.

Domain
General Security Concepts
Question 48
Correct
In regards to automation and orchestration, which of the following terms accurately captures the challenges faced when dealing with a system characterized by its intricate web of interconnected components and varied functionalities, potentially hindering seamless integration, effortless management, and straightforward comprehension?
Your answer is correct
Complexity
Technical debt
Ongoing supportability
Cost
Overall explanation
OBJ: 4.7 - Complexity refers to the degree of intricacy in a system or process. In automation and orchestration, high complexity can lead to challenges in maintenance, understanding, and implementation. Ongoing supportability relates to the ease with which a system can be maintained and supported over time, but it doesn't specifically address the intricacy or convolution of a system. While high complexity can lead to increased costs, the term 'cost' encompasses a broader range of financial considerations, not just those associated with intricate systems. While technical debt can be a consequence of complexity, it more specifically refers to the implied cost of additional rework caused by choosing a quicker yet less optimal solution.

Domain
Security Operations
Question 49
Incorrect
Which of the following is an aspect of asset management that ensures that each IT asset is clearly associated with a specific individual or department, providing clarity on responsibilities and access rights?
Decommissioning
Your answer is incorrect
Acquisition
Monitoring
Correct answer
Ownership
Overall explanation
OBJ: 4.2 - Ownership helps in determining who is responsible for the asset, ensuring clear lines of accountability and often helping in deciding the access rights. Monitoring involves keeping an eye on the performance and status of assets, rather than establishing responsibility. Decommissioning pertains to the process of retiring assets and doesn't directly associate assets with specific entities. Acquisition refers to the process of obtaining assets, not the association of assets with individuals or departments.

Domain
Security Operations
Question 50
Incorrect
The executive team at a software development firm decides that any project with a potential financial impact greater than $500,000 due to a security incident will require an immediate review and intervention. This financial impact figure represents which of the following in risk management?
Correct answer
Risk threshold
Risk tolerance
Risk level
Your answer is incorrect
Risk limit
Overall explanation
OBJ: 5.2 - The $500,000 financial impact figure is an example of a risk threshold, as it is the specific point at which the company must act to mitigate risk. While risk limit is not a standard term, it could colloquially be used to describe a risk threshold, but in this context, the correct term is "risk threshold." Risk level pertains to the severity of risk and does not describe the actionable limit set by the company. Risk tolerance refers to the general level of risk the firm is willing to accept, not the precise financial impact threshold for action.

Domain
Security Program Management and Oversight
Question 51
Correct
Lexicon, an AI company, wants to implement a security measure to identify and evaluate potential threats to their systems and networks. Which of the following is an example of a managerial security control that the company could implement?

Your answer is correct
Risk assessments
Firewall
Security guards

Intrusion detection system
Overall explanation
OBJ: 1.1 - Periodic evaluations, like risk assessments, are a managerial security control that involves regularly evaluating the threats to systems and networks. This can help the company identify potential threats and take steps to mitigate them. Security guards are considered operational controls, not managerial controls. Firewall is a technical security control that monitors and controls incoming and outgoing network traffic based on predetermined security rules. Intrusion detection system is a technical security control that monitors network traffic for signs of security threats.

Domain
General Security Concepts
Question 52
Incorrect
A drone manufacturer employs a real-time operating system (RTOS) to ensure timely task executions. While optimizing for real-time performance, which of the following security concerns might arise?
Uncontrolled cloud access.
Overhead from virtualization.
Correct answer
Inadequate buffer overflow protections.
Your answer is incorrect
Lack of legacy protocol support.
Overall explanation
OBJ: 3.1 - RTOSs prioritize performance, sometimes at the expense of security features like buffer overflow protections, potentially leaving the system susceptible to certain attacks. RTOSs aren't primarily concerned with supporting legacy protocols, and this isn't a direct security risk associated with them. RTOSs are designed for efficiency and generally don't involve the overheads from virtualization layers. While cloud access can pose risks, it's not an inherent security implication of using an RTOS.

Domain
Security Architecture
Question 53
Correct
A tech company discovers that the firmware in some of their devices contains a hidden backdoor. Upon investigation, it's determined that the compromised firmware came from an overseas supplier they contracted with. The backdoor gave attackers remote access to devices without user knowledge. What type of attack vector has the company fallen victim to?
On-path attack
Drive-by download
Your answer is correct
Supply chain
Bluesnarfing
Overall explanation
OBJ: 2.2 - This scenario depicts a supply chain compromise where the threat originated from a supplier. By introducing the backdoor at the production level, attackers ensured widespread distribution of the vulnerability, making it a potent and stealthy attack. In an on-path attack, an unauthorized intermediary intercepts communication between two parties, potentially altering it. While deceptive, it doesn't stem from supply chain vulnerabilities. Drive-by download involves automatically downloading malicious software onto a user's system without their knowledge, typically when visiting a compromised website. It doesn't relate to supply chain threats. Bluesnarfing refers to exploiting vulnerabilities in Bluetooth connections to steal data from another device. It doesn't involve compromising products at the supply level.

Domain
Threats, Vulnerabilities, and Mitigations
Question 54
Incorrect
Dion Training Solutions needs a network appliance capable of filtering traffic based on URL, HTTP headers, and specific web application functionalities. At which layer of the OSI model would this appliance primarily operate?
Layer 6
Your answer is incorrect
Layer 3
Correct answer
Layer 7
Layer 5
Overall explanation
OBJ: 3.2 - Layer 7, or the application layer, deals with end-user services, and appliances at this layer can make filtering decisions based on specifics like URLs, HTTP headers, and specific application functions. Layer 6, the presentation layer, is responsible for translating data between the application and transport layers. Layer 5, the session layer, manages connections between applications. It isn't focused on the content-specific criteria like URLs and HTTP headers. Layer 3 devices are concerned with IP addressing and routing.

Domain
Security Architecture
Question 55
Incorrect
Which of the following statements BEST explains the importance of environmental variables in regard to vulnerability management?
Environmental variables are specific conditions that trigger an automated response when a vulnerability is detected in an organization's systems
Environmental variables are factors that impact the physical security of an organization's premises
Correct answer
Environmental variables refer to the unique characteristics of an organization's infrastructure that can affect vulnerability assessments and risk analysis
Your answer is incorrect
Environmental variables are parameters used in vulnerability scanning tools to assess the security posture of an organization's network and infrastructure
Overall explanation
OBJ: 4.3 - Environmental variables refer to the unique characteristics of an organization's infrastructure, business environment, and operational context that can impact vulnerability assessments and risk analysis. Understanding these variables is crucial to conducting effective vulnerability management and developing appropriate risk mitigation strategies. These variables are not specific conditions triggering automated responses; rather, they are factors related to an organization's infrastructure and business environment that impact vulnerability management processes. While vulnerability scanning tools may use various parameters, environmental variables refer to different aspects related to an organization's infrastructure and business environment. While physical security factors are important, environmental variables in this context have a different focus.

Domain
Security Operations
Question 56
Correct
The HR department for a large corporation is looking to streamline the onboarding process for new employees. What can the use of scripting do to help attain this goal, in terms of system access?

Generating hard-copy user manuals for each new hire.

Directly improving onboarding training content.

Your answer is correct
Automating the provisioning of account credentials.

Facilitating personal interviews between IT and new hires.

Overall explanation
OBJ: 4.7 - Using scripting, IT can automatically create user accounts, set default passwords, and assign appropriate access rights based on the role of the new employee. While scripting can perform many tasks, producing physical manuals typically isn't within its domain of automation. Scripting aids in automation, but it doesn't replace or facilitate human-to-human interactions such as interviews. While scripting can automate various processes, it doesn't directly enhance the quality or content of training materials.

Domain
Security Operations
Question 57
Incorrect
Which of the following BEST describes an organizational structure that allows for autonomous decision-making in separate departments or sectors within the company?
Correct answer
Decentralized governance
Your answer is incorrect
Flat organization
Matrix structure
Hierarchical management
Overall explanation
OBJ: 5.1 -In decentralized governance, decision-making is distributed among various departments or sectors, promoting responsiveness and specialization. Hierarchical management implies a top-down approach to decision-making and does not necessarily allow for autonomy in separate departments. Flat organization refers to an organization with few or no levels of middle management between staff and executives, which affects management layers but not necessarily decision-making distribution. While matrix structure involves multiple reporting lines, it does not solely define the decision-making autonomy of departments.

Domain
Security Program Management and Oversight
Question 58
Correct
You are a security analyst at Dion Training and you discover that an unauthorized device has been connected to the company’s network. As you investigate, you discover that the device was added so the employee could play video games during her breaks. What type of threat actor are you dealing with?
Insider Threat
Unskilled Actor
Nation-state Actor
Your answer is correct
Shadow IT
Overall explanation
OBJ: 2.1 - Shadow IT is a type of threat actor that is the result of unauthorized or unapproved IT systems or devices within an organization. In this case, the device may introduce security risks and compliance issues for an organization, but the employee wasn't intending any harm to the company. An unskilled threat actor is one that lacks technical expertise or sophistication. Unskilled attackers often launch simple and opportunistic attacks using tools or scripts developed by others. The employee in this case may be unskilled but the employee didn't attach the device to cause problems for the company. Nation-state actors are a type of threat actor that is sponsored by a government or a country's military. They normally have high resources/funding and high level of sophistication/capability, but they are not a part of the organization they attack. An insider threat is a type of threat actor that has authorized access to an organization’s network, systems, or data and has variable resources/funding and level of sophistication/capability depending on their role and position. Insider threats can abuse their authorized access, leak information, sabotage operations, or collaborate with external actors. They intend to harm the company by their actions. 

For support or reporting issues, include Question ID: 64b86cba381e518e73f4166c in your ticket. Thank you.

Domain
Threats, Vulnerabilities, and Mitigations
Question 59
Correct
Enrique, the head of IT at Dion Training, is tasked with ensuring all deployed company systems adhere to a set of standardized configurations. He wants to reduce the attack surface as much as possible. Which of the following techniques would BEST reduce the organization's attack surface?
Requiring frequent password resets for all employees.
Implementing a VPN for any remote access to company devices.
Deploying antivirus software on all company workstations and other devices.
Your answer is correct
Turning off all unused services and closing unnecessary ports.
Overall explanation
OBJ: 4.1 - Deactivating unused services and closing ports minimizes potential entry points for attackers, thus effectively reducing the attack surface by limiting exposed system components. VPNs secure remote connections by encrypting data in transit. However, while they enhance the security of data communication, they don't necessarily reduce the attack surface of the underlying systems. While antivirus software provides protection against malware and certain threats, it doesn't directly reduce the attack surface. It's an essential layer of defense but doesn't minimize system exposure by itself. Regularly changing passwords enhances security against potential unauthorized access but doesn't directly affect the attack surface related to system configurations or open services.

Domain
Security Operations
Question 60
Incorrect
What element of backup strategy involves making data copies regularly at set intervals?
Load balancing
Replication
Correct answer
Frequency
Your answer is incorrect
Journaling
Overall explanation
OBJ: 3.4 - Frequency refers to how often data backups are carried out. Regular backups at set intervals are crucial to minimize the potential loss of data. Replication is the copying of data from one system to another. The regularity with which this is done, isn't an important part of replication. Journaling entails verifying and logging data, not the regularity of backups. While load balancing is a technique for distributing workloads across multiple computers or networks, it doesn't relate to how frequently backups are created.

Domain
Security Architecture
Question 61
Correct
Florence is the CEO of a company. She has the final say over all decisions made regarding the business, IT, accounting, and other departments. What type of governance does Florence's company have?
Decentralized governance
Your answer is correct
Centralized governance
Committee governance
Board governance
Overall explanation
OBJ: 5.1 - Centralized governance involves decision-making authority concentrated in a single authority or department within an organization. In this structure, key decisions are made at the top level and are then disseminated throughout the organization. Decentralized governance involves distributing decision-making power among different departments or units within the organization, rather than being concentrated in a single authority. Board governance typically refers to the governing body of an organization, composed of members who represent various stakeholders. The board's role is to oversee the organization's activities, but it may not always involve centralized decision-making power. Committee governance involves decision-making authority vested in committees, which are groups of individuals formed to address specific tasks or issues within the organization. It does not necessarily involve a single authority or department with centralized decision-making power.

Domain
Security Program Management and Oversight
Question 62
Correct
Which of the following vulnerabilities is unique to cloud computing environments, posing risks related to unauthorized access and data manipulation?
Side loading
Buffer overflow
Cross-site scripting (XSS)
Your answer is correct
Insecure Interfaces and APIs
Overall explanation
OBJ: 2.3 - Insecure Interfaces and APIs are a type of vulnerability that arises when the interaction between users and cloud services through interfaces and APIs is not secure, exposing systems to potential unauthorized access and manipulation of data. Cross-site scripting (XSS) is a security vulnerability typically found in web applications, enabling attackers to inject malicious scripts into websites viewed by other users, potentially leading to a variety of malicious activities. Buffer overflows occur when a program writes more data to a block of memory, or buffer, than it was allocated for, which can lead to various issues, including the potential execution of arbitrary code. Side loading refers to the practice of installing applications on a device without using the official app store, which can lead to various security concerns, including the installation of malicious software.

Domain
Threats, Vulnerabilities, and Mitigations
Question 63
Correct
Kelly Innovations Corp, an IT company, is implementing a process of encryption where two parties establish a shared secret for communication purposes. Which of the following MOST accurately describes this process?

Your answer is correct
Key exchange
Hashing
Asymmetric encryption
Symmetric encryption
Overall explanation
OBJ: 1.4 - Key exchange is a process in which two communicating parties establish a shared secret key, typically used for symmetric encryption. This key is established in a manner so that eavesdroppers, even if they intercept the key exchange messages, cannot determine the shared key. The most common method for key exchange is the Diffie-Hellman protocol. Asymmetric encryption uses different keys for encryption and decryption, but it doesn't involve the exchange of cryptographic keys. Symmetric encryption the same key for both encryption and decryption, but it doesn't involve the exchange of cryptographic keys. Hashing involves converting input data (often called a message) into a fixed-length string of bytes. It's primarily used for data integrity checks and is not reversible, meaning you cannot retrieve the original input from its hash. Therefore, it isn't suitable for the purpose of exchanging cryptographic keys or establishing shared secrets for communication.

Domain
General Security Concepts
Question 64
Incorrect
Which of the following ports, if left open and unmonitored, might allow database queries from unauthorized external sources?
Correct answer
Port 1433
Port 21
Your answer is incorrect
Port 53
Port 443
Overall explanation
OBJ: 2.5 - Port 1433 is the default for Microsoft SQL Server. Organizations typically restrict or monitor access to this port to prevent unauthorized database operations. Domain Name System (DNS) uses port 53 for resolving domain names into IP addresses. It isn't associated with database operations. Port 443 is used for secure web traffic through SSL/TLS. It's not directly related to database queries. File Transfer Protocol (FTP) uses port 21 for unencrypted data transfers, not for database operations.

Domain
Threats, Vulnerabilities, and Mitigations
Question 65
Correct
Which of the following BEST explains the difference between an Agent-based and Agentless NAC?
Your answer is correct
Agent based NACs use additional software to authenticate users, while Agentless NACs use network level protocols to authenticate users.
Both involve monitoring network traffic without the need for additional software, but Agent-based NACs collect more data.
Agent based NACs use network level protocols to authenticate users, while Agentless NACs use additional software to authenticate users.

Both require additional software installed on network devices to monitor network traffic, but Agentless NACs collect more data.
Overall explanation
OBJ: 4.4 - Both forms of NAC authenticate users and grant access. Agent-based NACs use a software component installed on a central server to monitor network traffic, while Agentless involves monitoring network devices directly through the use of network level protocols without the need for additional software. Agent-based NACs require additional software. There isn't a difference in the amount of data they collect. Both forms of NAC authenticate users and grant access. Agent-based NACs use a software component installed on a central server to monitor network traffic, while Agentless involves monitoring network devices directly through the use of network level protocols without the need for additional software. Agentless NACs don't require additional software. There isn't a difference in the amount of data they collect.

Domain
Security Operations
Question 66
Incorrect
Which of the following vulnerabilities BEST describes a situation where a threat actor can manipulate data after it has been verified by an application, but before the application uses it for a specific operation?
Resource exhaustion
Correct answer
Time-of-check (TOC)
Your answer is incorrect
Race conditions
Memory leaks
Overall explanation
OBJ: 2.3 - A TOC vulnerability occurs when an attacker exploits the time gap between the verification of data and its use, potentially leading to unauthorized or malicious activities. Memory leaks are when a program doesn't release memory that it no longer needs, leading to potential system slowdowns or crashes. This does not involve data manipulation after verification. Race conditions relate to the unexpected order and timing of events in software execution but are not specifically about the gap between data verification and use. Resource exhaustion refers to the overuse of system resources, be it CPU time, memory, or others, which can lead to denial of service. It's not specific to data manipulation after its verification.

Domain
Threats, Vulnerabilities, and Mitigations
Question 67
Incorrect
When sending an encrypted message to Dion Training, a client would use which of the following to ensure only Dion Training can decrypt and read the message?
Correct answer
Public key
Key escrow
Wildcard certificate
Your answer is incorrect
Private key
Overall explanation
OBJ: 1.4 - The client would use the company's public key to encrypt the message. Only Dion Training, with the corresponding private key, can decrypt and read the message, ensuring confidentiality and demonstrating the importance of public-key cryptography. Key escrow refers to the secure storage of cryptographic keys, ensuring they can be accessed under specific conditions, but it's not directly used to encrypt or decrypt messages. A private key is kept secret by its holder and is used to decrypt messages that are encrypted with its corresponding public key. It's not used by external entities to encrypt messages to the key holder. A wildcard certificate secures multiple subdomains under a main domain but doesn't directly involve message encryption or decryption.

Domain
General Security Concepts
Question 68
Correct
Which mitigation technique involves the use of tools like Nagios or Splunk to continuously observe and check the operation of a system or network?
Your answer is correct
Monitoring
Patching
Hardening techniques
Segmentation
Overall explanation
OBJ: 2.5 - Monitoring, the continuous observation and checking of system or network operations, often involves tools like Nagios or Splunk to ensure its functionality and security. Implementing hardening techniques to secure a system, which might include many methods, doesn't inherently imply the use of Nagios or Splunk. Patching is the act of updating or fixing software to address vulnerabilities, but it is not particularly about continuous observation using specific tools. Dividing a network into different parts or segments for security and performance enhancement, but not specifically using observation tools like Nagios or Splunk.

Domain
Threats, Vulnerabilities, and Mitigations
Question 69
Correct
Which of the following terms BEST describe the affirmation of the validation of the accuracy and thoroughness of compliance-related reports?

Your answer is correct
Attestation
Independent third-party audit
Internal assessment
Regulatory examination
Overall explanation
OBJ: 5.5 - Attestation is the term that refers to the process of affirming the accuracy and completeness of compliance reports. It involves providing formal statements or declarations about the organization's compliance with specific regulations or standards. Attestation can be done internally by the organization's management or externally by a third-party auditor. An independent third-party audit involves an external and unbiased assessment conducted by an independent auditor or a third-party organization. The purpose of this audit is to provide an objective evaluation of the organization's compliance status. Independent third-party audits are often used to validate and verify compliance claims made by the organization and can offer more credibility to compliance reports. Internal assessment involves the organization's internal evaluation of its adherence to established compliance requirements. This process may include self-assessments, internal audits, and reviews conducted by the organization's compliance team to ensure that it meets the necessary regulatory and security standards. A regulatory examination is an external evaluation conducted by a government agency or a regulatory body to ensure that an organization is complying with specific regulations or industry standards. During a regulatory examination, the organization's compliance practices, controls, and processes are thoroughly reviewed to assess their alignment with the applicable rules and requirements.

Domain
Security Program Management and Oversight
Question 70
Correct
Which of the following BEST describes how automation and orchestration in cybersecurity operations influence employee satisfaction and retention?
Facilitates frequent role rotation among teams.
Your answer is correct
Reduces repetitive and mundane tasks.
Decreases the demand for cybersecurity professionals.
Directly increases salary packages.
Overall explanation
By automating routine tasks, employees can focus on more challenging and fulfilling aspects of their roles, enhancing satisfaction and retention. While automation can handle specific tasks, it doesn't reduce the overall demand for skilled professionals in cybersecurity. While automation might indirectly lead to operational savings, it doesn't directly influence individual employee salaries. Automation standardizes operations, but it doesn't directly promote or facilitate role rotation within cybersecurity teams.
Domain
Security Operations
Question 71
Incorrect
Which of the following are hardware issues that result from products that are no longer being made or supported, but are still usable?

Hardware tampering
Correct answer
End-of-life vulnerability
Hardware cloning
Your answer is incorrect
Legacy vulnerability
Overall explanation
OBJ: 2.3 - End-of-life vulnerability can allow a hardware attack that involves exploiting vulnerabilities in devices that are no longer supported or updated by the manufacturer. It can allow an attacker to compromise the security or functionality of the device, or use it as a gateway to access other systems or networks. A legacy vulnerability may allow an attack that involves exploiting vulnerabilities in devices that are outdated or obsolete, but still in use. It can allow an attacker to compromise the security or functionality of the device, or use it as a gateway to access other systems or networks. Hardware tampering is a hardware attack that involves physically altering or damaging hardware devices to compromise their functionality, performance, or security. It can allow an attacker to install malware, backdoors, spyware, or vulnerabilities on the device. Hardware cloning is a hardware attack that involves creating unauthorized copies of hardware devices to counterfeit their functionality, performance, or security. It can allow an attacker to sell fake products, steal intellectual property, or bypass authentication mechanisms.

Domain
Threats, Vulnerabilities, and Mitigations
Question 72
Correct
Susan, a security analyst at Kelly Innovations LLC, is reviewing alerts from the IPS. She recognizes a pattern of false positives from signature-based detections. Which of the following is the MOST likely cause for false positives in signature-based detection systems?
Your answer is correct
The signatures require tuning.
The IPS is scanning encrypted traffic only.
Signature databases are stored in volatile memory.
The system is only updated with old signatures.
Overall explanation
OBJ: 4.5 - When signatures are overly broad or not precisely defined, they might incorrectly match legitimate network traffic, leading to false positives. Signature-based detection works by inspecting traffic patterns, whether encrypted or not. However, the encrypted nature of traffic isn't the primary reason for false positives in signature-based detection. While outdated signatures might miss newer threats, they aren't typically the cause of false positives. Instead, they might lead to false negatives. Where the signature database is stored does not influence the accuracy of the detection. It's the quality and precision of the signatures that matter most.

Domain
Security Operations
Question 73
Correct
Dion Training is conducting a security awareness training program for its employees to enhance their cybersecurity knowledge. As part of this program, they have planned and executed phishing campaigns. Which of the following BEST describes the primary objective of phishing campaigns conducted during security awareness training?

To prevent any form of malware from spreading within the organization's network.
To promote a competitive environment among employees.
To trick employees into revealing sensitive information.
Your answer is correct
To test employees' ability to recognize and report phishing attempts.
Overall explanation
OBJ: 5.6 - The main objective of phishing campaigns conducted during security awareness training is to test employees' ability to identify and report phishing attempts. These campaigns are designed to simulate real-world phishing attacks to gauge how well employees can recognize suspicious emails and report them to the appropriate authorities. The primary objective of phishing campaigns is not to promote a competitive environment among employees. While phishing may involve malware, it doesn't always. In addition, preventing phishing won't prevent any form of malware from spreading on a network. The primary objective of phishing campaigns is not to trick employees into revealing sensitive information.

Domain
Security Program Management and Oversight
Question 74
Incorrect
An investment firm allows a fluctuation of up to 10% in the value of its high-risk investment portfolio compared to the expected return on investment, but immediate action is required if this threshold is exceeded. This 10% fluctuation represents an example of:
Your answer is incorrect
Risk management
Correct answer
Risk tolerance
Risk matrix
Risk appetite
Overall explanation
OBJ 5.2 - The 10% fluctuation is an example of the firm's risk tolerance, which specifies the risk tolerance, which is the acceptable variance in the high-risk portfolio's performance before triggering action. Risk management is the overarching process of identifying, assessing, and responding to risks, which includes setting risk tolerance but is not represented by the 10% fluctuation itself. A risk matrix is a visual tool used to determine the severity and likelihood of risks, not the acceptable variance in investment performance. While the firm's decision to have a high-risk investment portfolio at all does reflect its risk appetite, the question specifically refers to the acceptable variance, which is the risk tolerance.

Domain
Security Program Management and Oversight
Question 75
Incorrect
Clumsy Contraptions Engineering is seeking to change its security footing. In the past, they have found that too many pieces of malicious software have gotten past the system. Their Chief Security Officer believes they need a device which will actively evaluate traffic and reject or modify packets according to policies the company sets. What type of device is the CSO suggesting?
Remote Access
Correct answer
Inline
Fail-close
Your answer is incorrect
SASE
Overall explanation
OBJ: 3.2 - Inline devices are designed to interact with network traffic actively and can take actions such as accepting, rejecting, or modifying packets, making them the optimal choice for this scenario. Secure Access Service Edge (SASE) is a form of cloud architecture that combines a number of services as a single service. By providing services like Software-defined wide are network (SD-WAN), firewalls as a service, secure web gateways, and zero-trust network access, SASE will reduce cost and simplify management while improving security. The integrated nature of the architecture means the technologies used will work together efficiently. It may include a packet analyzer, but that isn't the focus of the architecture. Fail-close refers to what happens when a network encounters errors and exceptions. Fail-close means that when errors occur or exceptions are encountered, the system denies further access. This prevents any further network traffic until the error or exception are dealt with. While this provides greater security, it means that a website can’t be accessed even if the error encountered is minor or doesn’t pose a security threat. This is a response to errors and exceptions, it doesn't read and interact with packets. Remote access allows users to connect to a network or a device from a distant location, but it does not pertain to actively interacting with network traffic to reject or modify packets.

Domain
Security Architecture
Question 76
Correct
Reed & Jamario Security Services has recommended your company use a port based system to prevent unauthorized users and devices. Which of the following are they recommending?
Your answer is correct
802.1X
IDS
Fail-closed
Fail-open
Overall explanation
OBJ: 3.2 - 802.1x is a standard developed by the IEEE to govern port-based network access. When used with a RADIUS based authentication server it provides authentication services, checking user credentials to ensure that the user is a legitimate part of the organization and granting access to only those areas of the system that the user is allowed to access. Fail-open refers to what happens when a network encounters errors and exceptions. Fail-open means that when errors occur or exceptions are encountered, the system continues allowing access rather than denying access. Fail-open allows a website to continue offering services even after an error has occurred. The emphasis is, therefore, keeping the website up while the error is addressed, hoping that the error is a minor issue. An intrusion detection system (IDS) monitors network traffic for malicious activities. It alerts to the potential activity but does not prevent it from passing through the network. In this way, it provides a layer of protection without slowing down network performance. Fail-close refers to what happens when a network encounters errors and exceptions. Fail-close means that when errors occur or exceptions are encountered, the system denies further access. This prevents any further network traffic until the error or exception are dealt with. While this provides greater security, it means that a website can’t be accessed even if the error encountered is minor or doesn’t pose a security threat.

Domain
Security Architecture
Question 77
Correct
Which of the following BEST describes a threat actor who primarily depends on commonly found tools, often easily accessible from the web or dark web?
Bug bounty hunter
APT
Ethical hacker
Your answer is correct
Script kiddie
Overall explanation
OBJ: 2.1 - Typically a novice in cyber-attacks, a script kiddie heavily relies on off-the-shelf tools without much understanding of how they work. A Bug bounty hunter is an individual who seeks software vulnerabilities in exchange for rewards or compensation but doesn't rely solely on basic, common tools. Advanced persistent threats (APTs) are often state-sponsored groups with significant resources, known for long-term, targeted attacks using a variety of sophisticated tools and techniques. An ethical hacker is a cybersecurity professional who systematically attempts to penetrate systems on behalf of its owners to find vulnerabilities.

Domain
Threats, Vulnerabilities, and Mitigations
Question 78
Correct
A software development company regularly releases software updates to its global customer base. Recently, some customers reported receiving unauthorized and potentially malicious software updates. The company wants to implement a security technique to ensure the authenticity and integrity of its software updates when delivered to customers. Which of the following would BEST assist in achieving this goal?

Intrusion Detection System
Antivirus Scanning
Multi-factor Authentication
Your answer is correct
Code Signing
Overall explanation
OBJ: 4.1 - Code signing is a security technique that allows software developers to digitally sign their software updates before distribution. By using cryptographic signatures, code signing ensures the authenticity and integrity of the software updates. When customers receive the updates, their systems can verify the signature to confirm that the update came from a trusted source and that it has not been altered during transmission. This is an effective way for the company to guarantee the legitimacy of its software updates and protect customers from potentially malicious or unauthorized modifications. An Intrusion Detection System (IDS) is a security solution that monitors network traffic and system activities to detect suspicious or malicious behavior. While IDS is valuable for identifying potential security incidents, it primarily focuses on network-level security and does not directly address the authenticity and integrity of software updates and it is not the most appropriate technique for ensuring the legitimacy of software updates. Multi-factor authentication (MFA) is a security method that requires users to provide two or more forms of identification before accessing a system. MFA is commonly used to enhance user authentication and access control. However, it is not directly related to verifying the authenticity and integrity of software updates when delivered to customers. MFA does not address the process of ensuring that the software updates are coming from a trusted source and have not been tampered with during distribution. Therefore, while MFA is a valuable security measure, it is not the most suitable technique for the company's current objective. Antivirus scanning is a security measure that involves using antivirus software to detect and remove malware from a system. While antivirus scanning is crucial for protecting computers from known malware, it does not directly address the authenticity and integrity of software updates. It focuses on identifying and removing existing malware but does not ensure that the software updates are legitimate and have not been tampered with during distribution.

Domain
Security Operations
Question 79
Correct
Which of the following statements BEST explains the importance of enforcing baselines when automating and orchestrating secure operations?
Your answer is correct
Enforcing baselines helps to standardize configurations across systems, enabling efficient automation and reducing the risk of security incidents.
Enforcing baselines allows for the almost complete automation of incident response, reducing the need for large security teams and incident response teams.
Baselines eliminate the need for continuous monitoring of systems because these things are all either automated or orchestrated, thereby freeing up resources.
Baselines set the initial targets for automating threat hunting and penetration testing, thereby reducing dependence on human input.
Overall explanation
OBJ: 4.7 - Enforcing baselines is about maintaining a standard, secure configuration across all systems. This standardization is crucial for efficient automation, as it ensures all systems are at a known, secure state. This reduces the risk of security incidents as it minimizes configuration drift and variance, which can create security vulnerabilities. While automation can certainly assist in incident response, enforcing baselines does not mean you can completely automate this process. Human intervention is still necessary to determine the appropriate response to an incident, even when automation is used to aid in detection and initial response. Enforcing baselines does not eliminate the need for continuous monitoring. While it provides a standard configuration that can help in identifying anomalies, continuous monitoring is still necessary to ensure that systems remain at their baseline state and to detect any potential security incidents. While automation can certainly aid in threat hunting, this is not the primary purpose of enforcing baselines. Baselines are more about maintaining a standard level of security across the system, rather than actively seeking out threats.

Domain
Security Operations
Question 80
Correct
If a company's server has an estimated Single Loss Expectancy (SLE) of $15,000 due to an operational failure, and the Annual Rate of Occurrence (ARO) of these failures is expected to be 0.1 times per year, what is the Annual Loss Expectancy (ALE)?
$15,000
$150,000
$150
Your answer is correct
$1,500
Overall explanation
OBJ: 5.2 - The ALE is calculated by multiplying the SLE by the ARO. With an SLE of $15,000 and an ARO of 0.1, the ALE equals $1,500 ($15,000 \* 0.1 = $1,500). This represents the expected yearly financial loss due to operational failures. $150 isn't correct. $15,000 isn't correct. $150,000 isn't correct.

Domain
Security Program Management and Oversight
Question 81
Correct
Reed, a cybersecurity specialist at Dion Training Solutions, is optimizing the company's IPS. He notes that while signature-based detection is highly effective against known threats, it has some limitations. Which of the following BEST describes a limitation of signature-based detection in an IPS?
It automatically updates with behavioral patterns of users.
It encrypts network traffic to hide malicious signatures.
It requires substantial network bandwidth to operate.
Your answer is correct
It might not detect zero-day exploits.

Overall explanation
OBJ: 4.5 - Signature-based detection relies on a database of known threat patterns. Therefore, it might not recognize or stop new threats or zero-day exploits because their signatures aren't in the database yet. Automatically updating with behavioral patterns of users describes behavior-based or heuristic detection, not signature-based detection. Signature-based detection relies on predefined patterns of known threats. Signature-based detection doesn't encrypt traffic. Instead, it matches traffic patterns against known threat signatures. While an IPS does process traffic, the bandwidth consumption is not a direct limitation of signature-based detection. The bandwidth concern is more about the throughput of the IPS device itself.

Domain
Security Operations
Question 82
Incorrect
Horizon Security, a cybersecurity training company, experienced a data breach due to a vendor's negligence. This breach led to a significant loss of sensitive customer information. What type of consequence is Horizon MOST likely to face?

Sanctions
Loss of license
Your answer is incorrect
Fines
Correct answer
Reputational damage
Overall explanation
OBJ: 5.4 - Reputational damage refers to the potential harm or negative impact on Horizon's reputation due to its failure to comply with data protection regulations. As a result of the data breach, customers may come to believe that Horizon doesn't know enough about cybersecurity to prevent the breach and/or properly protect its customer data. Its reputation in the cybersecurity training industry may be tarnished. Fines are penalties imposed by regulatory authorities for non-compliance with data protection regulations. However, in this scenario, Horizon did not commit the negligence, so they are not likely to face fines unless they are located in a country that has laws regarding fines for any data breach regardless of responsibility. Sanctions are also potential penalties for non-compliance, but they are typically more severe and may include restrictions or limitations on the company's operations. However, in this scenario, Horizon did not commit the negligence, so they are not likely to face sanctions unless they are located in a country that has laws regarding sanctions for any data breach regardless of responsibility. Loss of license could be a consequence of non-compliance in certain industries. However, in this scenario, Horizon did not commit the negligence, so they are not likely to lose any licenses they may have.

Domain
Security Program Management and Oversight
Question 83
Incorrect
When considering the RSA algorithm, which description BEST captures its underlying mathematical property used for public key cryptography?
Digital signature
Hash function
Correct answer
Trapdoor function
Your answer is incorrect
Symmetric encryption
Overall explanation
OBJ: 1.4 - The RSA algorithm uses a trapdoor function, where encryption is easy to perform using the public key, but reversing the process (decryption) without the private key is challenging. RSA's principle is that certain mathematical operations are easy to perform, but their inverse operations are difficult without specific knowledge. Symmetric encryption is a type of encryption where the same key is used for both encryption and decryption, unlike RSA which uses a pair of public and private keys. A hash function is a process that converts an input (often a long string) into a fixed-size value, commonly used for verifying data integrity but not specifically tied to RSA's public key cryptography. A digital signature is a means to verify the authenticity of a digital message or document, using a combination of hashing and encryption, but it isn't the mathematical property of RSA.

Domain
General Security Concepts
Question 84
Correct
In a meeting with the CEO, Burton has asked for guidance on developing the rules of engagement for an upcoming penetration test. The CEO doesn't think they need to create rules of engagement since they are hiring an experienced, well respected company to do the penetration testing. Why is it important for the company to still establish rules of engagement?

They need to set the timeline for later penetration tests.

Your answer is correct
They need to set boundaries and limitations during the penetration test.

They need to know the total costs of the penetration test.

They need the names of all personnel who will be involved in the penetration test.

Overall explanation
OBJ: 5.3 - Rules of engagement are essential to ensure that the security assessment is conducted within specified parameters and doesn't inadvertently harm the vendor's operations or reputation. While the cost might be a consideration in the overall agreement, the rules of engagement are more about the technical and operational constraints of the assessment. While listing the personnel who will be involved in the security assessment might be part of the overall planning, it's not the primary purpose of the rules of engagement. Rules of engagement are focused on the current assessments, not future ones.

Domain
Security Program Management and Oversight
Question 85
Correct
When evaluating the introduction of automated systems in a security operations center (SOC), which of the following is a prominent time-related benefit that security professionals might expect?
Increased time for team meetings.
Extended working hours for security staff.
Your answer is correct
Reduced response time to security incidents.
Longer periods for system patching.
Overall explanation
Automated systems can instantly detect and respond to threats, ensuring faster mitigation compared to manual responses. Automation can speed up patching, but it doesn't necessarily extend the time patching takes. The focus is on efficiency, not prolonging processes. While automation can free up time, it doesn't specifically allocate more time for meetings or administrative tasks. Automation doesn't directly increase the working hours for staff. Instead, it often aims to decrease the need for overtime and off-hours interventions.
Domain
Security Operations
Question 86
Incorrect
When considering user interactions with a web service, which of the following are the security measures that involve the secure creation and transfer of identifiers as well as enforcing inactivity limits to prevent unauthorized access?
Timeout policies
Your answer is incorrect
Session cookies
Correct answer
Session management
Token handling
Overall explanation
OBJ: 5.1 - These refer to the protocols that maintain the security of user interactions on the web, including the secure creation and transfer of unique identifiers or "cookies," and setting inactivity limits to automatically terminate the session if the user is inactive for a certain period. Timeout policies contribute to these practices by defining when an inactive session should end, but they do not include the secure transmission and generation of identifiers. Token handling involves managing security tokens within a system, but on its own, it doesn't cover all aspects of what is required to maintain the security of user interactions, including setting inactivity limits. While session cookies are a part of what is managed, this term alone does not encompass the full scope of practices like setting inactivity limits.

Domain
Security Program Management and Oversight
Question 87
Correct
While performing a digital investigation, which of the following statements BEST describes the role of preservation of evidence?
Your answer is correct
It maintains the integrity of digital evidence over time.
It allocates budgetary resources for the forensic investigation.
It allows investigators to prioritize evidence collection.
It provides legal teams with a roadmap for case strategy.
Overall explanation
OBJ: 4.8 - Preserving evidence ensures that it remains unchanged and is kept in a state where its authenticity is intact for the duration of the investigation and any subsequent legal proceedings. While resources are necessary, preservation focuses on keeping evidence secure and unaltered. While prioritization is a part of investigation processes, preservation itself is about safeguarding evidence once collected. Preservation is about ensuring evidence remains unchanged, not about strategizing for a legal case.

Domain
Security Operations
Question 88
Incorrect
You are a cybersecurity analyst working for a software development company that develops mobile applications. The company wants to implement a secure and standardized method for users to grant third-party applications access to their account data without sharing their credentials. As a cybersecurity analyst, you recommend implementing OAuth for this purpose. Which of the following approaches would be the MOST effective way to implement OAuth in the given scenario?
Requesting users to share their account credentials directly with third-party applications for data access.
Your answer is incorrect
Generating random access tokens for users and sharing them directly with third-party applications for data access.
Providing third-party applications with unrestricted access to user account data without authentication or authorization.
Correct answer
Implementing a central OAuth authorization server to handle user authentication and issue access tokens to third-party applications.
Overall explanation
OBJ: 4.6 - Implementing a central OAuth authorization server is the best approach for secure and standardized access to user account data. The authorization server acts as an intermediary between the user and the third-party application, handling user authentication and issuing access tokens to authorized applications. By using OAuth, the user can grant limited access to their account data without sharing credentials directly. Providing unrestricted access to user account data without authentication or authorization is highly insecure and violates the principles of access management. OAuth's purpose is to provide controlled access to specific data, ensuring that third-party applications are authorized only for the data they require and nothing more. While generating random access tokens is a step in the right direction, sharing them directly with third-party applications is not recommended. OAuth operates on the principle of "authorization delegation," where the user grants access to specific data to third-party applications. Access tokens should be issued by an authorization server and presented by the third-party application to access limited data on behalf of the user. Asking users to share their account credentials directly with third-party applications violates the core principle of OAuth, which is to avoid sharing credentials with third parties. Sharing credentials increases the risk of unauthorized access to user accounts and sensitive data, which undermines the security objectives of OAuth.

Domain
Security Operations
Question 89
Incorrect
Dion Training Solutions is aiming to optimize their wide-area network (WAN) while ensuring advanced network management and performance optimization. They are considering a solution that can be deployed both on-premises and in the cloud. Which of the following technologies would BEST match their requirements?
TLS
Correct answer
SD-WAN
Your answer is incorrect
SASE
AH
Overall explanation
OBJ: 3.2 - SD-WAN (Software-defined wide area network) provides centralized network management, flexible routing, and traffic management capabilities. It can be hosted both on-premises and in the cloud, giving it an edge for comprehensive WAN optimization. TLS (Transport Layer Security) operates at the application layer and is primarily used for securing application-level communication. It doesn't offer WAN optimization or centralized network management. While SASE offers both network security and WAN capabilities, its primary selling point is as a cloud-based solution that integrates both. It doesn't focus solely on WAN performance optimization. AH (Authentication header) is a protocol component of IPSec which offers packet integrity but does not specifically cater to WAN optimization or management.

Domain
Security Architecture
Question 90
Correct
Alex, a network administrator, reviews logs from the company's main database server. He finds that every night at 3 AM, a backup process runs which generates a series of logs. However, on scanning through last week's data, he finds that logs from two nights are missing entirely. On further investigation, Alex discovers a new, unauthorized user account was created on one of those nights. What might Alex reasonably infer from these observations?
The database server accidentally skipped the backup on those nights due to low storage.
The IT team might have created a new account for a new employee and forgot to inform him.
The backup process was paused by the IT department for maintenance purposes.
Your answer is correct
An attacker gained access, created the unauthorized account, and removed logs.
Overall explanation
OBJ: 2.4 - The combination of missing logs and an unauthorized account creation suggests malicious activity. Attackers remove evidence of their presence and actions by deleting or altering logs. Pausing a backup for maintenance is plausible, but it wouldn't result in the creation of an unauthorized account, nor would it typically remove logs. While low storage could prevent backups, it wouldn't delete logs or create unauthorized accounts. While the IT team creating a new account for a new employee and forgetting to inform him might explain the creation of a new account, it doesn't account for the missing logs. It's also a best practice for IT to notify of such changes.

Domain
Threats, Vulnerabilities, and Mitigations
